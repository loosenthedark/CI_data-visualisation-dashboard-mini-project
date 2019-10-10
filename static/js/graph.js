queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);

function makeGraphs(error, salaryData) {
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        d.yrs_service = parseInt(d['yrs.service']);
        d.yrs_since_phd = parseInt(d['yrs.since.phd']);
        d.salary = parseInt(d.salary);
    });

    show_discipline_selector(ndx);

    show_percentages_of_profs_by_gender(ndx, 'Female', '#percentage_of_female_profs');
    show_percentages_of_profs_by_gender(ndx, 'Male', '#percentage_of_male_profs');

    show_gender_balance(ndx);
    show_average_salary_by_gender(ndx);
    show_rank_distribution_by_gender(ndx);

    show_tenure_salary_correlation(ndx);
    show_phd_salary_correlation(ndx);

    // show_salary_correlational_data(ndx, 'yrs_service', '#tenure_salary_correlation_scatter_plot');
    // show_salary_correlational_data(ndx, 'yrs_since_phd', '#phd_salary_correlation_scatter_plot');

    dc.renderAll();
}

function show_discipline_selector(ndx) {
    var discipline_dim = ndx.dimension(dc.pluck('discipline'));
    var discipline_group = discipline_dim.group();

    dc.selectMenu('#discipline_select_dropdown_menu')
        .dimension(discipline_dim)
        .group(discipline_group);
}

function show_percentages_of_profs_by_gender(ndx, gender, element) {

    var percentageProfs = ndx.groupAll().reduce(

        function(p, v) {
            if (v.sex == gender) {
                p.count++;
                if (v.rank == "Prof") p.are_profs++;
            }
            return p;
        },

        function(p, v) {
            if (v.sex == gender) {
                p.count--;
                if (v.rank == "Prof") p.are_profs--;
            }
            return p;
        },

        function() {
            return {
                count: 0,
                are_profs: 0
            };
        }

    );

    dc.numberDisplay(element)
        .formatNumber(d3.format('.2%'))
        .valueAccessor(function(d) {
            if (d.count == 0) { return 0 }
            else {
                return d.are_profs / d.count;
            }
        })
        .group(percentageProfs);
}

function show_gender_balance(ndx) {
    var gender_dim = ndx.dimension(dc.pluck('sex'));
    var gender_group = gender_dim.group();

    // dc.barChart('#gender_balance_bar_chart')
    //     .width(500)
    //     .height(350)
    //     .x(d3.scale.ordinal())
    //     .xUnits(dc.units.ordinal)
    //     .dimension(gender_dim)
    //     .group(gender_group)
    //     .margins({ top: 40, right: 40, bottom: 40, left: 50 })
    //     .transitionDuration(3000)
    //     .xAxisLabel("GENDER")
    //     // .elasticY(true)
    //     .yAxis().ticks(10);

    dc.pieChart('#gender_balance_pie_chart')
        .height(300)
        .radius(130)
        .dimension(gender_dim)
        .group(gender_group)
        .transitionDuration(3000);
}

function show_average_salary_by_gender(ndx) {
    var gender_dim = ndx.dimension(dc.pluck('sex'));

    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return { count: 0, total: 0, average: 0 };
    }

    var averageSalaryByGender = gender_dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart('#gender_average_salary_bar_chart')
        .width(350)
        .height(350)
        .dimension(gender_dim)
        .group(averageSalaryByGender)
        .margins({ top: 40, right: 40, bottom: 40, left: 60 })
        .valueAccessor(function(d) {
            return Math.round(d.value.average);
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .transitionDuration(3000)
        .xAxisLabel("GENDER")
        .yAxisLabel("AVERAGE SALARY ($)")
        .elasticY(true)
        .yAxis().ticks(8);

    console.log(averageSalaryByGender.all());

}

function show_rank_distribution_by_gender(ndx) {

    var gender_dim = ndx.dimension(dc.pluck('sex'));

    // var profByGender = gender_dim.group().reduce(
    //     function(p, v) {
    //         p.count++;
    //         if (v.rank == "Prof") p.match++;
    //         return p;
    //     },

    //     function(p, v) {
    //         p.count--;
    //         if (v.rank == "Prof") p.match--;
    //         return p;
    //     },

    //     function() {
    //         return { total: 0, match: 0 };
    //     });

    function get_rank_by_gender(dimension, rank) {

        function add_item(p, v) {
            p.total++;
            if (v.rank == rank) p.match++;
            return p;
        }

        function remove_item(p, v) {
            p.total--;
            if (v.rank == rank) p.match--;
            return p;
        }

        function initialise() {
            return { total: 0, match: 0 };
        }

        return dimension.group().reduce(add_item, remove_item, initialise);
    }

    var profByGender = get_rank_by_gender(gender_dim, "Prof");
    var assocProfByGender = get_rank_by_gender(gender_dim, "AssocProf");
    var asstProfByGender = get_rank_by_gender(gender_dim, "AsstProf");

    console.log(asstProfByGender.all());

    dc.barChart('#gender_rank_distribution_stacked_chart')
        .width(400)
        .height(350)
        .dimension(gender_dim)
        .group(asstProfByGender, "Assistant Professor")
        .stack(assocProfByGender, "Associate Professor")
        .stack(profByGender, "Professor")
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("GENDER")
        .yAxisLabel("RANK DISTRIBUTION (%)")
        .valueAccessor(function(d) {
            if (d.value.total > 0) { return (d.value.match / d.value.total) * 100; }
            else { return 0; }
        })
        .legend(dc.legend().x(285).y(50).itemHeight(15).gap(5))
        .margins({ top: 40, right: 120, bottom: 40, left: 50 });
}

function show_tenure_salary_correlation(ndx) {
    var tenure_dim = ndx.dimension(dc.pluck('yrs_service'));
    var tenuredSalary_dim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.sex, d.rank];
    });

    var minTenure = tenure_dim.bottom(1)[0].yrs_service;
    var maxTenure = tenure_dim.top(1)[0].yrs_service;

    var tenureGroup = tenuredSalary_dim.group();

    var genderColors = d3.scale.ordinal()
        .domain(['Female', 'Male'])
        .range(['hotpink', 'blue']);

    dc.scatterPlot('#tenure_salary_correlation_scatter_plot')
        .width(550)
        .height(380)
        .x(d3.scale.linear().domain([minTenure, maxTenure]))
        .xAxisLabel('ACADEMIC TENURE (YEARS)')
        .yAxisLabel('SALARY ($)')
        .brushOn(false)
        .dimension(tenuredSalary_dim)
        .group(tenureGroup)
        .title(function(d) {
            return d.key[2] + " " + d.key[3] + " earned " + d.key[1];
        })
        .margins({ top: 20, right: 50, bottom: 60, left: 75 })
        .clipPadding(10)
        .transitionDuration(3000)
        .symbolSize(6)
        .colorAccessor(function(d) {
            return d.key[2];
        })
        .colors(genderColors)
        .renderHorizontalGridLines(true)
        .yAxis().ticks(10);
}

function show_phd_salary_correlation(ndx) {
    var phd_dim = ndx.dimension(dc.pluck('yrs_since_phd'));
    var yrsSincePhd_dim = ndx.dimension(function(d) {
        return [d.yrs_since_phd, d.salary, d.sex, d.rank];
    });

    var minYrsSincePhd = phd_dim.bottom(1)[0].yrs_since_phd;
    var maxYrsSincePhd = phd_dim.top(1)[0].yrs_since_phd;

    var phdSalaryGroup = yrsSincePhd_dim.group();

    var genderColors = d3.scale.ordinal()
        .domain(['Female', 'Male'])
        .range(['hotpink', 'blue']);

    dc.scatterPlot('#phd_salary_correlation_scatter_plot')
        .width(550)
        .height(380)
        .x(d3.scale.linear().domain([minYrsSincePhd, maxYrsSincePhd]))
        .xAxisLabel('NUMBER OF YEARS SINCE GAINING PHD')
        .yAxisLabel('SALARY ($)')
        .brushOn(false)
        .dimension(yrsSincePhd_dim)
        .group(phdSalaryGroup)
        .title(function(d) {
            return d.key[2] + " " + d.key[3] + " earned " + d.key[1];
        })
        .margins({ top: 20, right: 50, bottom: 60, left: 75 })
        .clipPadding(10)
        .transitionDuration(3000)
        .symbolSize(6)
        .colorAccessor(function(d) {
            return d.key[2];
        })
        .colors(genderColors)
        .renderHorizontalGridLines(true)
        .yAxis().ticks(10);
}
